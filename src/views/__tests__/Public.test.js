import React from "react";
import { Public } from "../Public";
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import userEvent from '@testing-library/user-event'
import { useAuth0 } from "@auth0/auth0-react";
import { getConfig } from "../../config";
import { MemoryRouter, Route } from "react-router-dom";

jest.mock("../../config");
jest.mock("@auth0/auth0-react");

const dashboards_api = JSON.stringify({
  "Test": [
    {
      "uid":"ednxmm755urk0e",
      "accessToken":"75931189a288473a88af2e56434658af",
      "title":"Elektřina",
      "dashboardUid":"7ni-KDsIz",
      "isEnabled":true,
      "slug":"elektrina"
    },
    {
      "uid":"ednxmn5spn4lcd",
      "accessToken":"7798957785e04da5859970c708864532",
      "title":"Počasí",
      "dashboardUid":"fdnsvf1k9tvy8c",
      "isEnabled":true,
      "slug":"pocasi"
    }
  ],
  "Test2": [
    {
      "uid":"uid2",
      "accessToken":"accesstoken2",
      "title":"Elektřina",
      "dashboardUid":"7ni-KDsIz",
      "isEnabled":true,
      "slug":"elektrina"
    }
  ]
});

const dashboards_api_empty = JSON.stringify({});

describe("The Public component", () => {
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

  it("loads dashboards from API", async () => {
    fetch.once(dashboards_api);
    render(<MemoryRouter><Public /></MemoryRouter>);

    await waitFor(() => screen.getByText("Test"));
    var links = screen.getAllByRole('link', { name: 'Elektřina' });
    expect(links[0]).toHaveAttribute('href', 'https://grafana.domecek.online/public-dashboards/75931189a288473a88af2e56434658af');
    expect(links[1]).toHaveAttribute('href', 'https://grafana.domecek.online/public-dashboards/accesstoken2');

    var links = screen.getAllByRole('link', { name: 'Počasí' });
    expect(links[0]).toHaveAttribute('href', 'https://grafana.domecek.online/public-dashboards/7798957785e04da5859970c708864532');

    expect(screen.getByText("Test2")).toBeInTheDocument();
  });

  it("loads dashboards from API - no dashboards", async () => {
    fetch.once(dashboards_api_empty);
    render(<MemoryRouter><Public /></MemoryRouter>);

    await waitFor(() => screen.getByText("Neexistují žádné Veřejné Nástěnky."));
  });
});
