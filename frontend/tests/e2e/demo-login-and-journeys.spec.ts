import { test, expect, request } from "@playwright/test";

test("demo login flow from UI", async ({ page }) => {
  await page.goto("/signin");
  await page.getByTestId("demo-login-button").click();
  await expect(page).toHaveURL(/\/events/);
});

test("critical API journeys across entities", async () => {
  const apiBase = process.env.E2E_API_URL || "http://localhost:5000/api/v1";
  const context = await request.newContext();
  const endpoint = (path: string) => `${apiBase}${path}`;

  const uniq = `${Date.now()}`;
  const organizerIdentifier = `organizer_${uniq}`;
  const organizerEmail = `${organizerIdentifier}@example.com`;
  const organizerPassword = "Organizer123";

  const registerResponse = await context.post(endpoint("/auth/register"), {
    data: {
      username: organizerIdentifier,
      name: "E2E Organizer",
      email: organizerEmail,
      password: organizerPassword,
      role: "ORGANIZER",
    },
  });
  expect([201, 409]).toContain(registerResponse.status());

  const loginResponse = await context.post(endpoint("/auth/login"), {
    data: { identifier: organizerIdentifier, password: organizerPassword },
  });
  expect(loginResponse.ok()).toBeTruthy();

  const eventSlug = `e2e-event-${uniq}`;
  const createEventResponse = await context.post(endpoint("/events"), {
    data: {
      title: "E2E Event",
      slug: eventSlug,
      description: "E2E event description",
      location: { venue: "MITS", city: "Gwalior", country: "India" },
      eventDate: new Date(Date.now() + 86400000).toISOString(),
      registrationDeadline: new Date(Date.now() + 3600000).toISOString(),
      ticketTypes: [{ name: "General", price: 0, limit: 100 }],
      status: "PUBLISHED",
    },
  });
  expect(createEventResponse.ok()).toBeTruthy();
  const createEventPayload = await createEventResponse.json();
  const eventId = createEventPayload.event?.id;
  expect(eventId).toBeTruthy();

  const createRegistration = await context.post(endpoint(`/events/${eventId}/register`), {
    data: { ticketType: "General", registrationData: { source: "playwright" } },
  });
  expect([201, 409]).toContain(createRegistration.status());

  const registrations = await context.get(endpoint("/registrations/me"));
  expect(registrations.ok()).toBeTruthy();
  const registrationsPayload = await registrations.json();
  const registrationId = registrationsPayload.registrations?.[0]?.id;
  expect(registrationId).toBeTruthy();

  const createPayment = await context.post(endpoint("/payments/create-order"), {
    data: { eventId, amount: 500, currency: "INR", gateway: "RAZORPAY" },
  });
  expect(createPayment.ok()).toBeTruthy();
  const paymentPayload = await createPayment.json();
  expect(paymentPayload.payment?.id).toBeTruthy();

  const createAnnouncement = await context.post(endpoint(`/events/${eventId}/announcements`), {
    data: { title: "Playwright update", message: "Announcement journey test" },
  });
  expect(createAnnouncement.ok()).toBeTruthy();

  const notifications = await context.get(endpoint("/notifications"));
  expect(notifications.ok()).toBeTruthy();

  await context.dispose();
});
