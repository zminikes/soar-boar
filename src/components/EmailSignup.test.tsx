import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the config module so the test runs against a known URL. vi.mock
// is hoisted above imports, so the import below sees the mocked value.
vi.mock('../game/config', () => ({
  APPS_SCRIPT_URL: 'https://script.google.com/test-deploy',
}));

import { EmailSignup } from './EmailSignup';
import { APPS_SCRIPT_URL } from '../game/config';

describe('EmailSignup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an email input and submit button in the idle state', () => {
    render(<EmailSignup />);
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign up/i })).toBeInTheDocument();
  });

  it('does not submit when the email is invalid', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<EmailSignup />);
    await user.type(screen.getByLabelText('Email address'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /Sign up/i }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('transitions idle → submitting → done on a successful POST', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    render(<EmailSignup />);
    await user.type(screen.getByLabelText('Email address'), 'alice@example.com');
    await user.click(screen.getByRole('button', { name: /Sign up/i }));
    expect(await screen.findByText(/You.?re on the list/i)).toBeInTheDocument();
  });

  it('shows the error alert when the POST returns non-2xx', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    render(<EmailSignup />);
    await user.type(screen.getByLabelText('Email address'), 'alice@example.com');
    await user.click(screen.getByRole('button', { name: /Sign up/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Something went wrong/i);
  });

  it('shows the error alert when the network fetch rejects', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    render(<EmailSignup />);
    await user.type(screen.getByLabelText('Email address'), 'alice@example.com');
    await user.click(screen.getByRole('button', { name: /Sign up/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('POSTs to APPS_SCRIPT_URL with text/plain content-type and JSON body', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    render(<EmailSignup />);
    await user.type(screen.getByLabelText('Email address'), 'alice@example.com');
    await user.click(screen.getByRole('button', { name: /Sign up/i }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(APPS_SCRIPT_URL);
    const requestInit = init as RequestInit;
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toMatchObject({
      'Content-Type': 'text/plain;charset=utf-8',
    });
    const body = JSON.parse(requestInit.body as string);
    expect(body).toMatchObject({ email: 'alice@example.com', source: 'homepage', website: '' });
  });
});
