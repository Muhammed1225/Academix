/**
 * Sends a connection invitation.
 *
 * TODO: Confirm the production endpoint and response contract with the back-end
 * team. The expected request body is { userId, note }.
 */
export async function sendConnectionRequest(userId: string, note: string): Promise<void> {
  const response = await fetch('/api/connections/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ userId, note }),
  });

  if (!response.ok) {
    let message = 'Unable to send the connection request. Please try again.';
    try {
      const result = await response.json() as { error?: string };
      if (result.error) message = result.error;
    } catch {
      // Use the standard message when the endpoint does not return JSON.
    }
    throw new Error(message);
  }
}
