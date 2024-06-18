import React from "react";
import { Loxone } from "../Loxone";
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

const homes_api_empty = JSON.stringify([]);

describe("The Loxone component", () => {
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

    // IntersectionObserver isn't available in test environment
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: () => null,
      unobserve: () => null,
      disconnect: () => null
    });
    window.IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
/*
  it("loads home from API - no homeId", async () => {
    fetch.once(homes_api_one);
    render(<MemoryRouter><Loxone /></MemoryRouter>);

    await waitFor(() => screen.getByText("<v.1>;hodnota_vašeho_loxone_tokenu"));
    expect(screen.getByText("/dev/udp/domecek.online/hodnota_portu")).toBeInTheDocument();
    expect(screen.getByText("Konfigurace Loxone")).toBeInTheDocument();
  });

  it("loads home from API - unknown home", async () => {
    fetch.once(homes_api_empty);
    render(
      <MemoryRouter initialEntries={['loxone/1']}>
        <Route path='loxone/:homeId'>
          <Loxone />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("<v.1>;hodnota_vašeho_loxone_tokenu"));
    expect(screen.getByText("/dev/udp/domecek.online/hodnota_portu")).toBeInTheDocument();
    expect(screen.getByText("Konfigurace Loxone")).toBeInTheDocument();
  });*/

  it("loads home from API", async () => {
    fetch.once(homes_api_one);
    render(
      <MemoryRouter initialEntries={['loxone/1']}>
        <Route path='loxone/:homeId'>
          <Loxone />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("<v.1>;FwpPnq9pVnw5ZQ"));
    expect(screen.getByText("/dev/udp/domecek.online/2222")).toBeInTheDocument();
    expect(screen.getByText("Konfigurace Loxone pro dům: Test")).toBeInTheDocument();
  });
});
