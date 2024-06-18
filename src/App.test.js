import React from 'react';
import { render } from "@testing-library/react";
import App from './App';
import { useAuth0 } from "@auth0/auth0-react";

jest.mock("@auth0/auth0-react");

describe("The App", () => {
  beforeEach(() => {
    useAuth0.mockReturnValue({
      loading: false,
      user: {
        name: "Test user",
        email: "test@user.com",
        picture: "https://avatar.com",
      },
    });
  });

  it('renders without crashing', () => {
    render(<App />);
  });

});
